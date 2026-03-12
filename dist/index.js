import express from "express";
import { WebSocketServer } from "ws";
import { SignalingServer } from "./signaling/SignalingServer.js";
const app = express();
const port = 8080;
const httpServer = app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
export const signlaingserver = new SignalingServer(httpServer);
signlaingserver.attach();
//# sourceMappingURL=index.js.map