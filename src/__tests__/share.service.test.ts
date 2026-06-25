const mockSendMail = jest.fn();

jest.mock("nodemailer", () => ({
	createTransport: jest.fn().mockReturnValue({
		sendMail: mockSendMail,
	}),
}));

import { emailService } from "../services/emailService";

beforeEach(() => jest.clearAllMocks());

describe("emailService.sendShareLink", () => {
	it("chama nodemailer.sendMail com os parâmetros corretos", async () => {
		mockSendMail.mockResolvedValue({ messageId: "test-id" });

		await emailService.sendShareLink("ana@teste.com", "Ana Lima", "uuid-abc-123");

		expect(mockSendMail).toHaveBeenCalledWith(
			expect.objectContaining({
				to: "ana@teste.com",
				subject: expect.stringContaining("Ana Lima"),
				html: expect.stringContaining("uuid-abc-123"),
			})
		);
	});

	it("lança exceção quando sendMail falha", async () => {
		mockSendMail.mockRejectedValue(new Error("SMTP connection failed"));

		await expect(
			emailService.sendShareLink("ana@teste.com", "Ana Lima", "uuid-abc-123")
		).rejects.toThrow("SMTP connection failed");
	});
});
