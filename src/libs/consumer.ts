import {IncomingMessage} from 'http';
import WebSocket, {Server} from 'ws';
import {v4 as uuid} from 'uuid';
import {MessageBuilder} from "./message-builder";
// @ts-ignore
import cryptico from 'cryptico';
import {RequestMiddleware, Rpc} from "./decorators";

export type tListenerRequestMiddleware = (client: tWebSocketCrypto, request: IncomingMessage, message: MessageBuilder) => Promise<void> | void;
export type tListenerMessageMiddleware = (message: any) => Promise<void> | void;

export type tConsumerHandler = {
    metaName: string,
    name: string,
    requestMiddleware: tListenerRequestMiddleware[],
    messageMiddleware: tListenerMessageMiddleware[],
    handler: <T>(message: any) => Promise<T> | T
};

export type tOnListenHandler = ((port: number) => void )| undefined;
export type tOnErrorHandler = ((error: Error) => void )| undefined;

type tWebSocketCrypto = WebSocket & {
    crypto: {
        paraphrase: string,
        bits: number,
        rsa: any,
        public: string,
        clientPublic: string
    }
};

export type tConsumerOptions = {
    id?: string,
    port: number,
    logging?: boolean,
    onListen?: tOnListenHandler,
    onError?: tOnErrorHandler
};

type tConsumerClients = {
    [key: string]: WebSocket
}

export class Consumer extends Server {
    private readonly consumerId: string;
    private handlers: tConsumerHandler[] = [];

    protected _clients: tConsumerClients = {};

    private readonly logging: boolean = false;

    private readonly onListen: tOnListenHandler = undefined;
    private readonly onError: tOnErrorHandler = undefined;

    constructor(options: tConsumerOptions) {
        super({
            port: options.port
        });

        this.consumerId = options.id || uuid();
        this.logging = !!options.logging;
        this.onListen = options.onListen;
        this.onError = options.onError;

        this.init();
    }

    private init(){
        this.on('listening', this.listenHandler);
        this.on('error', this.errorHandler);

        this.on('connection', this.connectionHandler);
    }

    private get listenHandler(){
        return () => {
            if(this.logging)
                console.log('Server listening on', this.options.port!);

            if(this.onListen)
                this.onListen(this.options.port!);
        };
    }

    private get errorHandler(){
        return (error: Error) => {
            if(this.logging)
                console.error('Server has error: ', error);

            if(this.onError)
                this.onError(error);
        };
    }

    private get connectionHandler(){
        return (socket: tWebSocketCrypto, request: IncomingMessage) => {

            socket.on('message', this.messageHandler(socket, request));

            socket.on('close', (code, reason) => {
                const clientId = Object.keys(this._clients).find(clientId => this._clients[clientId] === socket);

                if(this.logging)
                    console.log('User disconnected', clientId);

                if(!clientId)
                    throw new Error('Unregistred user');

                delete this._clients[clientId];
            });
        }
    }

    private get buildMessage(){
        return MessageBuilder;
    }

    public sendToAll(name: string | undefined, message: any){
        const outcomeMessage = this.buildMessage.ofConsumer(name, {id: this.consumerId}, message);

        this.emit('message', outcomeMessage.toString());
    }

    public sendMessageToSocket(socket: WebSocket, answerTo: string | undefined, message: any){
        const outcomeMessage = this.buildMessage.ofConsumer(answerTo, {id: this.consumerId!}, message);

        socket.send(outcomeMessage.toString());

        return true;
    }

    public sendMessageToClient(clientId: string, answerTo: string | undefined, message: any){
        const client: WebSocket = this._clients[clientId];

        if(!client)
            throw new Error('Client not found');

        return this.sendMessageToSocket(client, answerTo, message);
    }

    @Rpc('connection')
    @RequestMiddleware((socket, request, message) => {
        message.message = socket.crypto.public;
    })
    protected connection(serverPublic: string){
        return serverPublic;
    }

    private messageHandler(socket: tWebSocketCrypto, request: IncomingMessage){
        return async (data: string) => {
            const incomingMessage = this.buildMessage.parseOfClient(data);

            if(incomingMessage.name === 'connection' && !this._clients[incomingMessage.sender.id]){
                if(this.logging)
                    console.log('User connected', 'id:', incomingMessage.sender.id, 'headers:', request.rawHeaders, 'clients size:', this.clients.size);

                // crypto
                {
                    const paraphrase = `${uuid()} ${uuid()} ${uuid()}`;
                    const bits = 1024;
                    const rsa = cryptico.generateRSAKey(paraphrase, bits);
                    const _public = cryptico.publicKeyString(rsa);

                    socket.crypto = {
                        paraphrase: paraphrase,
                        bits: bits,
                        rsa: rsa,
                        public: _public,
                        clientPublic: incomingMessage.message
                    };
                }

                this._clients[incomingMessage.sender.id] = socket;
            }

            const handler = this.handlers.find(handler => handler.name === incomingMessage.name);

            if(!handler)
                throw new Error('Cannot handler for this message');

            try {

                for(const requestMiddleware of handler!.requestMiddleware){
                    await requestMiddleware(socket, request, incomingMessage);
                }

                let message = incomingMessage.message;

                // crypto
                if(incomingMessage.name !== 'connection'){
                    message = JSON.parse(cryptico.decrypt(message, socket.crypto.rsa).plaintext);
                }

                for(const messageMiddleware of handler!.messageMiddleware){
                    message = await messageMiddleware(message);
                }

                let answer = await handler!.handler(message);

                // crypto
                if(incomingMessage.name !== 'connection'){
                    answer = cryptico.encrypt(JSON.stringify(answer), socket.crypto.clientPublic).cipher;
                }

                this.sendMessageToClient(incomingMessage.sender.id, incomingMessage.answerTo, answer);

            } catch (e) {
                if(this.logging)
                    console.error('Has error:', e);
            }
        };
    }
}