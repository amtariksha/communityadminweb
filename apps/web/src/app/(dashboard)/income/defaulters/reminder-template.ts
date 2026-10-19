/** The composer's text when the society has saved none (Setup › Defaulters keeps its own, INC-30). */
export const DEFAULT_REMINDER = {
  subject: 'Payment reminder: {{total_due}} due for {{unit}}',
  message_html:
    '<p>Dear Member,</p>' +
    '<p>This is a reminder that {{total_due}} is outstanding for unit {{unit}}. The bills past their due date are listed below.</p>' +
    '{{dues_table}}' +
    '<p>Interest @ {{interest_rate}} p.a. is charged on dues paid after the due date. Please ignore this message if you have already paid.</p>' +
    '{{payment_instructions}}',
} as const;

export const PLACEHOLDER_HINT = '{{unit}}, {{dues_table}}, {{total_due}}, {{interest_rate}}, {{payment_instructions}}';

export interface SavedReminderTemplate {
  reply_to?: string;
  from_name?: string;
  subject?: string;
  message_html?: string;
}

/** The composer's starting values: the saved template where it has a value, else ours. */
export function composerDefaults(saved: SavedReminderTemplate | undefined, societyName: string) {
  return {
    reply_to: saved?.reply_to ?? '',
    from_name: saved?.from_name ?? societyName,
    subject: saved?.subject || DEFAULT_REMINDER.subject,
    message_html: saved?.message_html || DEFAULT_REMINDER.message_html,
  };
}
