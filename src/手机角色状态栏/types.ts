export const PhoneMessageSchema = z
  .object({
    role: z.enum(['user', 'assistant', 'system']).catch('assistant'),
    name: z.string().catch(''),
    text: z.string().catch(''),
    time: z.string().catch(''),
  })
  .prefault({});

export const PhoneStateSchema = z
  .object({
    character: z
      .object({
        name: z.string().catch('未知角色'),
        avatar: z.string().catch(''),
        online: z.boolean().catch(true),
        status_text: z.string().catch('正在同步当前状态'),
        mood: z.string().catch('平静'),
        location: z.string().catch('未记录位置'),
      })
      .prefault({}),
    signal: z.coerce.number().int().transform(value => _.clamp(value, 0, 4)).catch(4),
    battery: z.coerce.number().int().transform(value => _.clamp(value, 0, 100)).catch(82),
    carrier: z.string().catch('Tavern'),
    clock: z.string().catch(''),
    messages: z.array(PhoneMessageSchema).catch([]),
  })
  .prefault({});

export type PhoneMessage = z.infer<typeof PhoneMessageSchema>;
export type PhoneState = z.infer<typeof PhoneStateSchema>;
