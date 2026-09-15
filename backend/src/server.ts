import app from "./presentation/app";

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

setInterval(() => {
  console.log("Server alive...");
}, 10000);