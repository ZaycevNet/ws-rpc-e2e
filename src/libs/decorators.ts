import {tConsumerHandler, tListenerMessageMiddleware, tListenerRequestMiddleware} from "./consumer";

export function ConsumerDecorator() {
    return <T extends {new(...args:any[]):{}, [key: string]: any}>(constructor: T) => {
        return class Controller extends constructor {
            private readonly handlers: any[] = [];

            constructor(...args: any[]) {
                super(...args);

                this.handlers = constructor._metaRpc.map((meta: tConsumerHandler): tConsumerHandler => {
                    let requestMiddleware = [];
                    if(constructor._metaRequestMiddleware)
                    requestMiddleware = constructor._metaRequestMiddleware
                        .filter((_meta: tConsumerHandler) => _meta.metaName === meta.metaName)
                        .map((meta: tConsumerHandler) => meta.requestMiddleware[0]);

                    let messageMiddleware = [];
                    if(constructor._metaMessageMiddleware)
                        messageMiddleware = constructor._metaMessageMiddleware
                            .filter((_meta: tConsumerHandler) => _meta.metaName === meta.metaName)
                            .map((meta: tConsumerHandler) => meta.messageMiddleware[0]);

                    return {
                        ...meta,
                        requestMiddleware,
                        messageMiddleware
                    };
                });

            }
        }
    }
}

export function Rpc(name: string) {
    return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
        if(!target.constructor._metaRpc) target.constructor._metaRpc = [];

        const handler: tConsumerHandler = {
            metaName: propertyKey,
            name,
            requestMiddleware: [],
            messageMiddleware: [],
            handler: descriptor.value
        };

        target.constructor._metaRpc.push(handler);
    }
}

export function RequestMiddleware(handler: tListenerRequestMiddleware){
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        if(!target.constructor._metaRequestMiddleware) target.constructor._metaRequestMiddleware = [];

        const _handler: tConsumerHandler = {
            metaName: propertyKey,
            name: '',
            requestMiddleware: [handler],
            messageMiddleware: [],
            handler: descriptor.value
        };

        target.constructor._metaRequestMiddleware.push(_handler);
    }
}

export function MessageMiddleware(handler: tListenerMessageMiddleware){
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        if(!target.constructor._metaMessageMiddleware) target.constructor._metaMessageMiddleware = [];

        const _handler: tConsumerHandler = {
            metaName: propertyKey,
            name: '',
            requestMiddleware: [],
            messageMiddleware: [handler],
            handler: descriptor.value
        };

        target.constructor._metaMessageMiddleware.push(_handler);
    }
}