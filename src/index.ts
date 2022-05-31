import 'dotenv/config';
import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import bodyParser from "body-parser";

const app: Express = express();
const port = process.env.PORT || 4000;

const multer = require('multer')
// Configuração de armazenamento
const storage = multer.diskStorage({
    destination: function (req: any, file: any, cb: any) {
        cb(null, 'uploads/')
    },
    filename: function (req: any, file: any, cb: any) {
        // Extração da extensão do arquivo original:
        const extension = file.originalname.split('.')[1];
        const originalName = file.originalname.split('.')[0];

        // Cria um código randômico que será o nome do arquivo
        const novoNomeArquivo = require('crypto')
            .randomBytes(64)
            .toString('hex');

        // Indica o novo nome do arquivo:
        cb(null, `${originalName}.${extension}`)
    }
});
const upload = multer({ storage })

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(express.static('public'));

process.on('uncaughtException', function (error: any) {
    console.log(error.stack);
    console.log("uncaughtException Node NOT Exiting...");
});

app.get('/', (req: Request, res: Response) => {
    res.send('Express + TypeScript Server');
});

app.post('/upload', upload.single('file'), async (req: Request, res: Response) => {

    const { PdfReader } = require("pdfreader");

    //@ts-ignore
    const file = req.file ?? null

    if (!file) {
        res.status(400).send({ msg: "file is not defined" })
    } else {
        let parsed: Array<string> = await parsePDF(`${file.destination}${file.filename}`)
        res.status(200).send({ data: parsed })
    }
});

const parsePDF = (filePath: string): Promise<Array<string>> => {
    return new Promise((resolve, reject) => {
        const { PdfReader } = require("pdfreader");
        
        let parsed: Array<string> = [];
        
        new PdfReader().parseFileItems(filePath, (err: any, item: any) => {
            if (err) {
                console.error("error:", err);
                reject(err)
            } else if (!item) {
                console.warn("end of file");
                resolve(parsed)            }
            else if (item.text) {
                console.log(item.text)
                parsed.push(item.text)
            }
        });
    })
}


app.listen(port, () => {
    console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});