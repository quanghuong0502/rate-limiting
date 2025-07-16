import express from "express";
import setupRoutes from "./routes/index.js";
import { InternalServerError } from "./errors/index.js";
import { setupGlobalMiddlewares } from "./middlewares/index.js";
const app = express();

app.use(express.json());

setupGlobalMiddlewares(app);
setupRoutes(app);

app.use((err, _req, res, _next) => {
  console.log(err);
  const error = err ?? new InternalServerError();
  res.status(error.code).json(error.getError());
});

const port = 3000;
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
