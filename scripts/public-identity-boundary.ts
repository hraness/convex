import { createHash } from "node:crypto";

const prohibitedIdentityDigests = [
  [6, "91ed2ef15eee7102873d33d852cae9a195eff25e758269de6457723b1d8dc29a"],
  [6, "46248ac689828800502186d8753cc5717c5c2b47712e8158705a510dc892f00b"],
  [6, "9873901d452faea24d90edd18a9f2c9e6a8b2571e763f0b5876903b8f2018c55"],
  [8, "bc62a3c14fec277e3dc6b504bf7c6348c2e421f8acc42032deddb0a96070f078"],
  [8, "17043b3de380ea992249c7e0e2ab7e14cc0b28c8b86800e3ae67f9e55bbb1036"],
  [6, "baa7789c3575dd04187cb8f40f2615e80949ae67309a14ed23ea52618b7d691b"],
] as const;

const startMarker = "<!-- oompa-local-efficiency:start -->";
const endMarker = "<!-- oompa-local-efficiency:end -->";
// The reviewed 0.4.4 public policy, including both markers and its final LF.
// A policy update requires another source review of this exact byte binding.
const reviewedPolicyDigest = "49b0208121bade5c3329606f5f691611fa69921d7abaf8162ee088f3729cb73a";

function identityScanSegments(repositoryPath: string, contents: string): string[] {
  if (repositoryPath !== "AGENTS.md") return [contents];

  const start = contents.indexOf(startMarker);
  const end = contents.indexOf(endMarker);
  const markerCount = [...contents.matchAll(/<!--\s*oompa-local-efficiency\b/giu)].length;
  const blockEnd = end + endMarker.length + 1;
  if (
    markerCount !== 2
    || start < 0
    || end <= start
    || (start > 0 && contents[start - 1] !== "\n")
    || contents[blockEnd - 1] !== "\n"
    || createHash("sha256").update(contents.slice(start, blockEnd)).digest("hex") !== reviewedPolicyDigest
  ) {
    throw new Error("AGENTS.md must contain exactly the reviewed public managed policy");
  }

  return [contents.slice(0, start), contents.slice(blockEnd)];
}

export function assertPublicIdentity(repositoryPath: string, contents: string): void {
  for (const segment of identityScanSegments(repositoryPath, contents)) {
    const normalized = segment.toLocaleLowerCase("en-US");
    for (const [length, expectedDigest] of prohibitedIdentityDigests) {
      for (let index = 0; index <= normalized.length - length; index += 1) {
        const digest = createHash("sha256")
          .update(normalized.slice(index, index + length))
          .digest("hex");
        if (digest === expectedDigest) {
          throw new Error(`${repositoryPath} contains a private product identity`);
        }
      }
    }
  }
}
