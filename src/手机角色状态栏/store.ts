import { PhoneMessageSchema, PhoneStateSchema, type PhoneMessage, type PhoneState } from './types';

const EXAMPLE_STATE: PhoneState = PhoneStateSchema.parse({
  character: {
    name: '青空莉',
    online: true,
    status_text: '正在与你保持联络',
    mood: '专注',
    location: '酒馆频道 · 私聊',
  },
  signal: 4,
  battery: 86,
  carrier: 'Tavern',
  messages: [
    { role: 'assistant', name: '青空莉', text: '状态栏已经连接，我会把当前状态同步到这里。', time: '刚刚' },
    { role: 'user', name: '你', text: '现在情况怎么样？', time: '刚刚' },
    { role: 'assistant', name: '青空莉', text: '一切正常。心情稳定，位置也已经记录。', time: '刚刚' },
  ],
});

function isUsableObject(value: unknown): value is Record<string, unknown> {
  return _.isPlainObject(value) && !_.isEmpty(value);
}

function firstUsable(...values: unknown[]): unknown | null {
  return values.find(isUsableObject) ?? null;
}

function normalizeMessages(raw: unknown, fallbackName: string): PhoneMessage[] {
  if (Array.isArray(raw)) {
    return raw
      .map(item => PhoneMessageSchema.safeParse(item))
      .filter((item): item is { success: true; data: PhoneMessage } => item.success)
      .map(item => item.data);
  }

  if (_.isPlainObject(raw)) {
    return _(raw as Record<string, unknown>)
      .entries()
      .map(([name, value]) => ({ role: 'assistant', name: name || fallbackName, text: String(value ?? ''), time: '' }))
      .filter(message => message.text.trim().length > 0)
      .value() as PhoneMessage[];
  }

  return [];
}

function normalizePhoneState(raw: unknown): PhoneState | null {
  if (!isUsableObject(raw)) {
    return null;
  }

  const characterSource = firstUsable(
    _.get(raw, 'character'),
    _.get(raw, '角色'),
    _.get(raw, '人物'),
    _.get(raw, '状态.角色'),
    raw,
  );

  const characterName = String(
    _.get(characterSource, 'name') ??
      _.get(characterSource, '姓名') ??
      _.get(characterSource, '名称') ??
      _.get(characterSource, '角色名') ??
      '未知角色',
  );

  const candidate = {
    character: {
      name: characterName,
      avatar: _.get(characterSource, 'avatar') ?? _.get(characterSource, '头像') ?? '',
      online: _.get(characterSource, 'online') ?? _.get(characterSource, '在线') ?? true,
      status_text:
        _.get(characterSource, 'status_text') ??
        _.get(characterSource, '状态短句') ??
        _.get(characterSource, '状态') ??
        _.get(raw, 'status_text') ??
        '正在同步当前状态',
      mood: _.get(characterSource, 'mood') ?? _.get(characterSource, '心情') ?? _.get(raw, '心情') ?? '平静',
      location:
        _.get(characterSource, 'location') ??
        _.get(characterSource, '位置') ??
        _.get(raw, 'location') ??
        _.get(raw, '位置') ??
        '未记录位置',
    },
    signal: _.get(raw, 'signal') ?? _.get(raw, '信号') ?? 4,
    battery: _.get(raw, 'battery') ?? _.get(raw, '电量') ?? 82,
    carrier: _.get(raw, 'carrier') ?? _.get(raw, '运营商') ?? 'Tavern',
    clock: _.get(raw, 'clock') ?? _.get(raw, '时间') ?? '',
    messages: normalizeMessages(
      _.get(raw, 'messages') ?? _.get(raw, '消息') ?? _.get(raw, '聊天') ?? _.get(raw, 'chat'),
      characterName,
    ),
  };

  const result = PhoneStateSchema.safeParse(candidate);
  return result.success ? result.data : null;
}

function readMessageVariables(): unknown | null {
  try {
    const variables = getVariables({ type: 'message', message_id: getCurrentMessageId() });
    return firstUsable(
      _.get(variables, 'stat_data.手机角色状态栏'),
      _.get(variables, 'stat_data.手机'),
      _.get(variables, 'stat_data.phone_status_bar'),
      _.get(variables, 'stat_data.phone'),
      _.get(variables, 'stat_data'),
      variables,
    );
  } catch (error) {
    console.warn('[手机角色状态栏] 读取消息楼层变量失败, 将尝试聊天变量', error);
    return null;
  }
}

function readChatVariables(): unknown | null {
  try {
    const variables = getVariables({ type: 'chat' });
    return firstUsable(
      _.get(variables, '手机角色状态栏'),
      _.get(variables, '手机'),
      _.get(variables, 'phone_status_bar'),
      _.get(variables, 'phone'),
      variables,
    );
  } catch (error) {
    console.warn('[手机角色状态栏] 读取聊天变量失败', error);
    return null;
  }
}

export const usePhoneStore = defineStore('phone_status_bar', () => {
  const data = ref<PhoneState>(PhoneStateSchema.parse({}));
  const ready = ref(false);

  function refresh() {
    const next = normalizePhoneState(readMessageVariables() ?? readChatVariables());
    if (!next) {
      ready.value = false;
      return;
    }

    ready.value = true;
    if (!_.isEqual(data.value, next)) {
      data.value = next;
    }
  }

  function loadExample() {
    data.value = klona(EXAMPLE_STATE);
    ready.value = true;
  }

  refresh();
  useIntervalFn(refresh, 2000);

  return { data, ready, refresh, loadExample };
});
