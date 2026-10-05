import express from 'express';
import cors from 'cors';


const app = express();

app.use(cors());

app.use(express.json());

app.use('/', (req, res)=>{
    res.status(200).send("minha api está funcionando.")
});



export default app;