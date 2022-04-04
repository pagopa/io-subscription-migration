import { createHandler } from "../handler";

describe("Create Handler Test", () => {
  it("should return a Reponse Error Internal", async () => {
    const handler = createHandler();

    const response = await handler();

    expect(response.kind).toBe("IResponseErrorInternal");
  });
});
