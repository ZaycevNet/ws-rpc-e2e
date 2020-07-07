import {Consumer, tConsumerOptions} from "../libs/consumer";
import {ConsumerDecorator, MessageMiddleware, RequestMiddleware, Rpc} from "../libs/decorators";
import {MessageBuilder} from "../libs/message-builder";

(async () => {
    const consumerOptions: tConsumerOptions = {
        port: 8000,
        logging: true
    };

    function requestMiddleware(socket: any, request: any, message: MessageBuilder){
        console.log();
        console.log('client: ', message.sender.id);
        console.log('timestamp: ', message.timestamp);
        console.log('encrypted message: ', message.message);
    }
    function messageMiddleware(message: string){
        console.log('decrypted message: ', message);
        console.log();
    }

    @ConsumerDecorator()
    class Controller extends Consumer {
        @Rpc('say-hello')
        @RequestMiddleware(requestMiddleware)
        @MessageMiddleware(messageMiddleware)
        sayHello(){
            return 'ok, nice to meet you';
        }

        @Rpc('free-line')
        @RequestMiddleware(requestMiddleware)
        @MessageMiddleware(messageMiddleware)
        freeLine(){
            return true;
        }

        @Rpc('say-name')
        @RequestMiddleware(requestMiddleware)
        @MessageMiddleware(messageMiddleware)
        sayName(){
            return 'ok, nice to meet you!';
        }
    }

    new Controller(consumerOptions);
})();