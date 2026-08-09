import { cleanupStoredCloneFixture } from "./clone-auth";

export default async function teardownCloneFixture() {
  await cleanupStoredCloneFixture();
}
