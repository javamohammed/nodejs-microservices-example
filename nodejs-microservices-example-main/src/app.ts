import "reflect-metadata";
import * as express  from  'express'
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
    const productRepo = db.getRepository(Product);
    try {
        const connection = await amqp.connect(AMQP_URL)
        const channel =  await connection.createChannel()
        channel.assertQueue("product_created", { durable: false})
        channel.assertQueue("product_updated", { durable: false})
        channel.assertQueue("product_deleted", { durable: false})

        //product created
        channel.consume('product_created', async (message) => {
            const newProduct = JSON.parse(message.content.toString())
            const product = new Product()
            product.id_admin = parseInt(newProduct.id)
            product.image = newProduct.image
            product.title = newProduct.title
            product.likes = parseInt(newProduct.likes)
            const p = await productRepo.create(product);
            const result = await productRepo.save(p);
            console.log(result)
            
        },{noAck: true})

        //product update
        channel.consume('product_updated', async (message) => {
            const eventProduct = JSON.parse(message.content.toString())
            console.log(eventProduct.id)
           const product = await productRepo.findOne({"id_admin": parseInt(eventProduct.id)})
            const updatedProduct = await productRepo.merge(product, {
                title: eventProduct.title,
                image: eventProduct.image,
                likes: parseInt(eventProduct.likes)

            });
            const result = await productRepo.save(updatedProduct);
           console.log(result)

        }, {noAck: true})
        
         //product deleted
         channel.consume('product_deleted', async (message) => {
           const eventProductID = message.content.toString();
           await productRepo.delete({"id_admin": parseInt(eventProductID)})
           console.log("product deleted")

        }, {noAck: true})          


        console.log("Server listening in 8000....!!")
        app.listen(8008)
        process.on('beforeExit', () => {
            connection.close()
            console.log("closing")
        })

    } catch (error) {
        throw error;
    }


  
})
