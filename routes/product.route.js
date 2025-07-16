import express from "express";
import { ProductController } from "../controllers/index.js";
const ProductRoutes = express.Router();

const productController = new ProductController();

ProductRoutes.get("/:id", productController.getProduct);
ProductRoutes.get("/products", productController.getProducts);

export default ProductRoutes;
