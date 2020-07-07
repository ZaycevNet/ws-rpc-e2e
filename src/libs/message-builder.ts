export enum eMessageBuilderType {
    Client,
    Server
}

export type tName = string | undefined;
export type tAnswerTo = string | undefined;
export type tSender = {
    id: string
};
export type tMessage = any;
export type tOutput = {
    name: tName | null,
    answerTo: tAnswerTo | null,
    sender: tSender | null,
    message: tMessage | null,
    timestamp: Date | null
};

export class MessageBuilder {
    name!: tName;
    answerTo!: tAnswerTo;
    sender!: tSender;
    message!: tMessage;
    timestamp!: Date;

    constructor(
        private readonly type: eMessageBuilderType
    ) {
        this.timestamp = new Date();
    }

    static ofConsumer(name: tName, sender: tSender, message: tMessage){
        const outcomeMessage = new MessageBuilder(eMessageBuilderType.Server);

        outcomeMessage.name = name;
        outcomeMessage.sender = sender;
        outcomeMessage.message = message;

        return outcomeMessage;
    }

    static ofClient(name: tName, sender: tSender, answerTo: tAnswerTo, message: tMessage){
        const incomeMessage = new MessageBuilder(eMessageBuilderType.Client);

        incomeMessage.name = name;
        incomeMessage.sender = sender;
        incomeMessage.answerTo = answerTo;
        incomeMessage.message = message;

        return incomeMessage;
    }

    static parseOfClient(data: string){
        const instance = new MessageBuilder(eMessageBuilderType.Client);
        const message = JSON.parse(data);

        instance.name = message.name;
        instance.answerTo = message.answerTo;
        instance.sender = message.sender;
        instance.message = message.message;

        return instance;
    }

    toJSON(){
        const output: tOutput = {
            name: null,
            answerTo: null,
            sender: null,
            message: null,
            timestamp: null
        };

        if(this.name) output.name = this.name;
        if(this.answerTo) output.answerTo = this.answerTo;
        if(this.sender) output.sender = this.sender;
        if(this.message) output.message = this.message;
        if(this.timestamp) output.timestamp = this.timestamp;

        return output;
    }

    toString(){
        return JSON.stringify(this.toJSON());
    }
}