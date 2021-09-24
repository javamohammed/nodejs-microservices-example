import "reflect-metadata";
import * as express  from  'express'
import { Request, Response }  from  'express'
import * as cors from "cors"
import { createConnection } from "typeorm";
import { Product } from "./entities/Product";
import { AMQP_URL } from "./config";
import * as amqp from "amqplib";
const app  = express()

app.use(cors({
    origin: ["http://localhost:3000/"]
}))
app.use(express.json())

createConnection().then( async (db) =>{


    try {
        const connection = await amqp.connect(AMQP_URL)
        const channel =  await connection.createChannel()
        const productRepo = db.getRepository(Product);
        app.get("/api/products", async (req: Request, res: Response) => {
            const products = await productRepo.find();
            res.json(products)
        })
    
        app.post("/api/products", async (req: Request, res: Response) => {
            const product = await productRepo.create(req.body);
            const result = await productRepo.save(product);
            channel.sendToQueue("product_created", Buffer.from(JSON.stringify(result)))
            res.send(result)
        })
    
        app.get("/api/products/:id", async (req: Request, res: Response) => {
            const product = await productRepo.findOne(req.params.id);
            res.send(product)
        })
    
        app.put("/api/products/:id", async (req: Request, res: Response) => {
            const product = await productRepo.findOne(req.params.id);
            const updatedProduct = await productRepo.merge(product, req.body);
            const result = await productRepo.save(updatedProduct);
            channel.sendToQueue("product_updated", Buffer.from(JSON.stringify(result)))
            res.send(result)
        })
    
        app.delete("/api/products/:id", async (req: Request, res: Response) => {
            const product = await productRepo.delete(req.params.id);
            channel.sendToQueue("product_deleted", Buffer.from(req.params.id))
            res.send(product)
        })
    
        app.get("/api/products/:id/like", async (req: Request, res: Response) => {
            const product = await productRepo.findOne(req.params.id);
            product.likes++
            channel.sendToQueue("product_updated", Buffer.from(JSON.stringify(product)))
            const result = await productRepo.save(product);
            res.send(result)
        })
    
    
        console.log("Server listening in 8000....!!")
        app.listen(8000)
        process.on('beforeExit', () => {
            connection.close()
            console.log("closing")
        })

    } catch (error) {
        throw error;
    }
  
})
