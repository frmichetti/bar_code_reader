import 'dotenv/config';
import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import bodyParser from "body-parser";
import * as path from 'path'
import fs from 'fs'
import javascriptBarcodeReader from 'javascript-barcode-reader'

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

app.post('/scan', upload.single('file'), async (req: Request, res: Response) => {    

    //@ts-ignore
    const file = req.file ?? null

    if (!file) {
        res.status(400).send({ msg: "file is not defined" })
    } else {
        let result =  await parsePDF(`${file.destination}${file.filename}`)
        await fs.unlink(`${file.destination}${file.filename}`, () => {})
        res.status(200).send({ rawData: result.parsed, bankCode: result.bankCode })
    }
});


app.post('/barcode', upload.single('file'), async (req: Request, res: Response) => {    

    //@ts-ignore
    const file = req.file ?? null

    if (!file) {
        res.status(400).send({ msg: "file is not defined" })
    } else {
        try {
            const result = await javascriptBarcodeReader({
                image: path.resolve(`${file.destination}${file.filename}`),
                barcode: 'code-2of5',
                barcodeType: 'interleaved',
                options: {    
                    useAdaptiveThreshold: true, // for images with sahded portions
                    singlePass: false
                  }
              })
              
              res.status(200).send({bankCode: result})    
        } catch (error) {
            console.error(error)
            res.status(200).send({bankCode: null})    
        } finally {
            await fs.unlink(`${file.destination}${file.filename}`, () => {})
        }
        
    }
});


const parsePDF = (filePath: string): Promise<any> => {
    return new Promise((resolve, reject) => {
        const { PdfReader } = require("pdfreader");
        
        let parsed: Array<string> = [];
        let bankCode: String;             
        
        new PdfReader().parseFileItems(filePath, (err: any, item: any) => {
            if (err) {
                console.error("error:", err);
                reject(err)
            } else if (!item) {
                console.warn("end of file");
                resolve({parsed, bankCode})            
            } else if (item.text) {
                console.log(item.text)
                parsed.push(item.text) 
                
                // Remove additional spaces  
                const s = item.text.replace(/\s\s+/g, ' ')                             
                
                if (new RegExp(/\d{5}.\d{5} \d{5}.\d{6} \d{5}.\d{6} \d \d{14}/).test(s)){
                    bankCode = s
                } else if(new RegExp(/\d{11}-\d \d{11}-\d \d{11}-\d \d{11}-\d/).test(s)){
                    bankCode = s
                } else if (new RegExp(/\d{12} \d{12} \d{12} \d{12}/).test(s)){
                    bankCode = s
                } else{
                    bankCode = "Not Found"
                }
            }
        });
    })
}


app.listen(port, () => {
    console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});