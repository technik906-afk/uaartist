/** Чистые хелперы форматирования — общие для серверных и клиентских компонентов. */

export const formatPrice = (value: number) => `${value.toLocaleString("ru-RU")} ₽`;
