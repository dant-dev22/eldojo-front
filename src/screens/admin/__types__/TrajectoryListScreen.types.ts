import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import type { AdminStackParamList } from "@/navigation/types";
import type { FightRecordType } from "@/types/api";

export type Props = NativeStackScreenProps<AdminStackParamList, "TrajectoryList">;

export type UnifiedModalTab = "events" | "fight" | "belts";

export type FightTotals = { victoria: number; empate: number; derrota: number };

export type FightStatTone = FightRecordType;

export type FightRecordStatInlineProps = {
  label: string;
  value: number;
  tone: FightStatTone;
  idPrefix?: string;
};

export type FightRecordFormBlockInlineProps = {
  idPrefix: string;
  typeValue: FightRecordType;
  onTypeChange: (v: FightRecordType) => void;
  opponentValue: string;
  onOpponentChange: (v: string) => void;
  dateValue: string;
  onDateChange: (v: string) => void;
  opponentCounter?: boolean;
};
