import authService from "../services/authService";

describe("registerUser", () => {
  it("Deve retornar null quando nome for vazio",
    async () => {
      const result = await authService.registerUser("", "gabriel@gmail.com", "12345",)

      expect(result).toBe(null);
      expect(result).toBeDefined();
    });

  it("Deve retornar null quando email for vazio",
    async () => {
      const result = await authService.registerUser("Gabriel", "", "12345");

      expect(result).toBe(null);
      expect(result).toBeDefined();
    });

  it("Deve retornar null quando senha for vazio",
    async () => {
      const result = await authService.registerUser("gabriel", "gabriel@gmail.com","");

      expect(result).toBe(null);
      expect(result).toBeDefined();
    });
});
