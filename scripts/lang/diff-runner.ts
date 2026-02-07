import { runDiffCli } from './diff';

runDiffCli().catch((error) => {
  console.error(error);
  process.exit(1);
});
