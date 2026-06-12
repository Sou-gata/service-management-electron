// In Electron, the Express API always runs on port 5000 on localhost.
// In the browser dev mode, it also points to localhost:5000.
const API_PORT = 5000;
const baseURL = `http://localhost:${API_PORT}`;
export default baseURL;

