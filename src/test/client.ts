import {Client, tClientOptions} from "../libs/client";
import readline from 'readline';

const r = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

(async () => {

    const clientOptions: tClientOptions = {
        url: 'ws://127.0.0.1:8000/',
        logging: false,
        onOpen: onOpen,
        onClose: () => {
            console.log();
            console.log('connection close');
            process.exit();
        }
    };

    const client = new Client(clientOptions);

    async function onOpen(){
        console.log('Hello, i`a ready');

        console.log();

        // say hello
        await new Promise(resolve => {
            r.question('Say me hello!\n', answer => {
                client
                    .request('say-hello', answer)
                    .then(e => {
                        console.log('Ok');
                        console.log();

                        resolve();
                    })
            })
        });

        await new Promise(resolve => {
            r.question('Whats your name?\n', answer => {
                client
                    .request('say-name', answer)
                    .then(e => {
                        console.log(e);
                        console.log();

                        resolve();
                    });
            });
        });

        console.log();

        console.log('ok, free line: ');

        r.on('line', message => {
            client
                .request('free-line', message);

            console.log();
            console.log('more');
        });
    }
})();