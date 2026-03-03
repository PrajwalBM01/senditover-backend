import express from "express";
import { WebSocketServer } from "ws";

const app = express();
const port = 8080;
const httpServer = app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

export const wws = new WebSocketServer({ server: httpServer });
