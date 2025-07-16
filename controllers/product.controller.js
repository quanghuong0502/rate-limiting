import { ProductService } from "../services/index.js";

class ProductController {
  constructor() {
    this.productServiceInstance = new ProductService();
  }

  getProduct = (req, res) => {
    const productId = req.params.id;
    console.log({ productId });
    return res
      .status(200)
      .json(this.productServiceInstance.getProduct(productId));
  };

  getProducts = (_req, res) => {
    return res.status(200).json(this.productServiceInstance.getProducts());
  };
}

export default ProductController;
