import { SQSEvent } from "aws-lambda";
import { SQSClient, DeleteMessageCommand } from "@aws-sdk/client-sqs";
import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";

const sqsClient = new SQSClient({});
const sesClient = new SESv2Client({});

class MailRequestInputDTO {
  public send_from: string;
  public send_to: string;
  public send_subject: string;
  public html: string;

  constructor(data: MailRequestInputDTO) {
    this.send_from = data.send_from;
    this.send_to = data.send_to;
    this.send_subject = data.send_subject;
    this.html = data.html;
  }
}

const validateRequiredFields = (data: MailRequestInputDTO) => {
  const requiredFields = ["send_to", "send_from", "send_subject", "html"];
  const missingFields = requiredFields.filter((field) => !data[field]);
  if (missingFields.length > 0)
    throw new Error(`Missing required fields: ${missingFields.join(", ")}`);
};

const sendSesMail = async (data: MailRequestInputDTO) => {
  const { html, send_from, send_subject, send_to } = data;
  const text = html.replace(/<[^>]*>?/gm, "");
  return await sesClient.send(
    new SendEmailCommand({
      Destination: {
        ToAddresses: [send_to],
      },
      Content: {
        Simple: {
          Subject: {
            Data: send_subject,
          },
          Body: {
            Html: { Data: html },
            Text: { Data: text },
          },
        },
      },
      FromEmailAddress: send_from,
    })
  );
};

const deleteMessage = async (receiptHandle: string) => {
  return sqsClient.send(
    new DeleteMessageCommand({
      QueueUrl: String(process.env.QUEUE_URL),
      ReceiptHandle: receiptHandle,
    })
  );
};

export const send = async (event: SQSEvent) => {
  for (const record of event.Records) {
    try {
      const body = new MailRequestInputDTO(JSON.parse(record.body ?? "{}"));
      validateRequiredFields(body);
      await sendSesMail(body);
    } catch (error) {
      console.error(error);
    } finally {
      await deleteMessage(record.receiptHandle);
    }
  }
};
