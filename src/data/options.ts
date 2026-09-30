/* ======================= 유상옵션 =======================
 * 이름·설명은 사전(opt.*), 가격은 타입별 정의(AptType.price)에 있다. 가격은 참고 예시 */
import type { OptionId } from './apt/schema';

export const OPTION_ORDER: OptionId[] = ['ext', 'sysac', 'builtin', 'dress', 'midDoor', 'merge'];
export const isOptionId = (v: unknown): v is OptionId => typeof v === 'string' && (OPTION_ORDER as string[]).includes(v);

// 모델하우스는 보통 발코니 확장형으로 꾸며 보여 준다
export const DEFAULT_OPTS: Partial<Record<OptionId, boolean>> = {ext: true};
