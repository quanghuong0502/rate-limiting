const mockProducts = [
  {
    product_id: "001",
    product_name: "product-name-001",
  },
  {
    product_id: "002",
    product_name: "product-name-002",
  },
];

class ProductService {
  getProduct(productId) {
    return mockProducts.find((product) => product.product_id === productId);
  }

  getProducts() {
    return mockProducts;
  }
}

export default ProductService;
