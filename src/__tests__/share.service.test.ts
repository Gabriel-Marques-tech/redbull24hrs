const mockSend = jest.fn();

jest.mock("resend", () => ({
	Resend: jest.fn().mockImplementation(() => ({
		emails: { send: mockSend },
	})),
}));

import { emailService } from "../services/emailService";

beforeEach(() => jest.clearAllMocks());

describe("emailService.sendShareLink", () => {
	it("chama resend.emails.send com os parâmetros corretos", async () => {
		mockSend.mockResolvedValue({ data: { id: "email-id" }, error: null });

		await emailService.sendShareLink("ana@teste.com", "Ana Lima", "uuid-abc-123");

		expect(mockSend).toHaveBeenCalledWith(
			expect.objectContaining({
				to: "ana@teste.com",
				subject: expect.stringContaining("Ana Lima"),
				html: expect.stringContaining("uuid-abc-123"),
			})
		);
	});

	it("lança exceção quando Resend retorna erro", async () => {
		mockSend.mockResolvedValue({ data: null, error: { message: "Resend API error" } });

		await expect(
			emailService.sendShareLink("ana@teste.com", "Ana Lima", "uuid-abc-123")
		).rejects.toThrow("Resend API error");
	});
});
