# Testing and Verification

- Every behavior change adds a regression test.
- Backend: JUnit 5 against real inputs where possible; `./mvnw test` must pass.
- Frontend: Vitest + Testing Library; `npm test` must pass.
- A test that a change makes fail first is the proof it tests the right thing.
- Verification is not tests alone: curl or browser measurements where the
  behavior is user-facing.
- A human reads the diff before commit.
