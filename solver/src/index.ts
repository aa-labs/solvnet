import { solve, fullfillLease } from "./run";
import express, { Request, Response } from "express";
import cors from "cors";

const app = express();
const port = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.post("/api/solve", async (req: Request, res: Response) => {
  let tokenAmount = req.body.tokenAmount;
  let tokenAddress = req.body.tokenAddress;
  console.log(tokenAddress, tokenAmount);
  let saAddresses = await solve(tokenAmount, tokenAddress);
  res.json({
    saAddresses,
  });
});

app.post("/api/fill", async (req: Request, res: Response) => {
  let leaseOwner = req.body.leaseOwner;
  let leaseId = req.body.leaseId;
  let saAddresses = await fullfillLease(leaseOwner, leaseId);
  console.log(req.body);
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
