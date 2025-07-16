import ProductRoutes from "./product.route.js";

const setupRoutes = (app) => {
  app.use("/product", ProductRoutes);
};

export default setupRoutes;
