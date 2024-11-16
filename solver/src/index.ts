import { solve, fullfillLease } from "./run";
import express, { Request, Response, NextFunction } from "express";

const app = express();
const port = process.env.PORT || 5001;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/api/solve", async (req: Request, res: Response) => {
  let tokenAmount = 10;
  let saAddresses = await solve(tokenAmount);
  res.json({
    saAddresses,
  });
});

app.get("/api/fill", async (req: Request, res: Response) => {
    let leaseOwner = "0xc2132D05D31c914a87C6611C10748AEb04B58e8F";
    let leaseId = 1;
    let saAddresses = await fullfillLease(leaseOwner, leaseId);
    res.json({
      saAddresses,
    });
  });



// app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
//   const status = err?.status || 500;
//   const message = err.message || "Internal Server Error";

//   res.status(status).json({
//     error: {
//       message,
//       status,
//     },
//   });
// });

// (async () => {
//   await solve();
// })();

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
