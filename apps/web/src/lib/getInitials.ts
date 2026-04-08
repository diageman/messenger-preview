/**
 * Реэкспорт getInitials из shared пакета.
 * Все компоненты apps/web должны импортировать отсюда,
 * а не дублировать логику split/map/join.
 */
export { getInitials } from '@messenger/shared/utils';
