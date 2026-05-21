import authService from "../services/authService";
import userRepository from "../repositories/userRepository";

jest.mock("../repositories/userRepository");

const mockRegister = userRepository.registerManager as jest.MockedFunction<typeof userRepository.registerManager>

describe("registerManager", () => {
  it("Deve retornar null quando nome for vazio",
    	async () => {
      		const result = await authService.registerManager("", "tester@gmail.com", "12345",)

      		expect(result).toBe(null);
      		expect(result).toBeDefined();
    });

  it("Deve retornar null quando email for vazio",
    	async () => {
      		const result = await authService.registerManager("Tester", "", "12345");

      		expect(result).toBe(null);
      		expect(result).toBeDefined();
    });

  	it("Deve retornar null quando senha for vazio",
    	async () => {
      		const result = await authService.registerManager("tester", "tester@gmail.com","");

      		expect(result).toBe(null);
			expect(result).toBeDefined();
    });

	it("Deve retornar o usuario criado com id, nome e email", async () => {
		mockRegister.mockResolvedValue({id: "1", name: "Tester", email: "tester@gmail.com"})
		const result = await authService.registerManager("tester", "tester@gmail.com", "1234")


		expect(result).toHaveProperty("id")
		expect(result).toHaveProperty("name");
		expect(result).toHaveProperty("email");
  })
});
