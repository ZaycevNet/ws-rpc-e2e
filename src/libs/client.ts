import WebSocket from "ws";
import {v4 as uuid} from 'uuid';
import {MessageBuilder} from "./message-builder";
// @ts-ignore
import cryptico from 'cryptico';

export type tClientOptions = {
    url: string,
    id?: string,
    onOpen?: tOnOpenHandler,
    onClose?: tOnCloseHandler,
    logging?: boolean
}

export type tOnOpenHandler = (() => void) | undefined;
export type tOnCloseHandler = ((code: number, message: string) => void) | undefined;

type tClientCrypto = {
    passphrase: string | undefined,
    bits: number | undefined,
    rsa: any | undefined,
    public: string | undefined,
    serverPublic: string | undefined
};

export class Client extends WebSocket {
    private readonly clientId: string;
    private readonly onOpen: tOnOpenHandler;
    private readonly onClose: tOnCloseHandler;
    private readonly logging: boolean = false;
    protected crypto: tClientCrypto = {
        passphrase: undefined,
        bits: undefined,
        rsa: undefined,
        public: undefined,
        serverPublic: undefined
    };
    protected already: boolean = false;

    constructor(options: tClientOptions) {
        super(options.url);

        this.clientId = options.id || uuid();

        this.logging = !!options.logging;

        this.onOpen = options.onOpen;
        this.onClose = options.onClose;

        // crypto
        this.crypto.passphrase = uuid() + ' ' + uuid() + ' ' + uuid();
        this.crypto.bits = 1024;
        this.crypto.rsa = cryptico.generateRSAKey(this.crypto.passphrase, this.crypto.bits);
        this.crypto.public = cryptico.publicKeyString(this.crypto.rsa);
        this.crypto.serverPublic = undefined;

        this.init();
    }

    init(){
        this.on('open', this.openHandler);
        this.on('close', this.closeHandler);
        this.on('message', this.messageHandler);
    }

    private get openHandler(){
        return () => {
            if(this.logging)
                console.log('Connection open', this.clientId);

            if(this.onOpen)
                this.onOpen();

            this
                .request('connection', this.crypto.public)
                .then(e => this.setAlready(e));
        };
    }

    private setAlready(serverPublic: any){
        this.crypto.serverPublic = serverPublic;
        this.already = true;
    }

    private get closeHandler(){
        return (code: number, message: string) => {
            if(this.logging)
                console.log('Connection close', 'code:', code, 'message', message);

            if(this.onClose)
                this.onClose(code, message);
        };
    }

    private get messageHandler(){
        return (message: string) => {
            const incomingMessage = MessageBuilder.parseOfClient(message);

            this.emit(incomingMessage.name!, incomingMessage.message);
        };
    }

    public request(name: string, data: any){
        if(name !== 'connection'){
            if(!this.already) return new Promise(resolve => setTimeout(() => {
                resolve(this.request(name, data));
            }, 200));

            data = cryptico.encrypt(JSON.stringify(data), this.crypto.serverPublic).cipher;
        }

        const outcomeMessage = MessageBuilder.ofClient(name, {id: this.clientId}, uuid(), data);

        return new Promise((resolve) => {
            this.on(outcomeMessage.answerTo!, (data: any) => {
                if(name !== 'connection'){
                    data = JSON.parse(cryptico.decrypt(data, this.crypto.rsa).plaintext);
                }

                resolve(data);
            });

            this.send(outcomeMessage.toString());
        });
    }
}