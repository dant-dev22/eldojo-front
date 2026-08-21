import React, { useMemo } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";

import type { BeltLevel, BeltStripe } from "@/types/api";
import { AppSelect } from "@/components/AppSelect";
import { colors, radius, spacing, typography } from "@/constants/theme";
import { getWebClassNameProps } from "@/utils/webClassNames";

export interface BeltSelectorValue {
  beltLevelId: number | null;
  stripeId: number | null;
}

export interface BeltSelectorProps {
  value: BeltSelectorValue;
  onChange: (next: BeltSelectorValue) => void;
  levels: BeltLevel[];
  label?: string;
  enabled?: boolean;
  levelError?: string | null;
  stripeError?: string | null;
  includeNoneOption?: boolean;
  levelNativeID?: string;
  stripeNativeID?: string;
  testID?: string;
}

const NONE_LEVEL_VALUE = "__none__";
const NONE_STRIPE_VALUE = "__none__";

export const BeltSelector: React.FC<BeltSelectorProps> = ({
  value,
  onChange,
  levels,
  label = "Grado / Cinta",
  enabled = true,
  levelError,
  stripeError,
  includeNoneOption = true,
  levelNativeID,
  stripeNativeID,
  testID,
}) => {
  const sortedLevels = useMemo(
    () => [...levels].sort((a, b) => a.order_index - b.order_index || a.id - b.id),
    [levels],
  );

  const selectedLevel = useMemo(
    () => sortedLevels.find((l) => l.id === value.beltLevelId) ?? null,
    [sortedLevels, value.beltLevelId],
  );

  const sortedStripes = useMemo(() => {
    if (!selectedLevel) return [] as BeltStripe[];
    return [...(selectedLevel.stripes ?? [])].sort(
      (a, b) => a.order_index - b.order_index || a.id - b.id,
    );
  }, [selectedLevel]);

  const levelItems = useMemo(() => {
    const items = sortedLevels.map((l) => ({
      label: l.display_name,
      value: String(l.id),
    }));
    if (includeNoneOption) {
      return [{ label: "Sin cinta asignada", value: NONE_LEVEL_VALUE }, ...items];
    }
    return items;
  }, [sortedLevels, includeNoneOption]);

  const stripeItems = useMemo(() => {
    const items = sortedStripes.map((s) => ({
      label: s.display_name,
      value: String(s.id),
    }));
    if (includeNoneOption) {
      return [{ label: "Sin stripe", value: NONE_STRIPE_VALUE }, ...items];
    }
    return items;
  }, [sortedStripes, includeNoneOption]);

  const handleLevelChange = (raw: string) => {
    const beltLevelId = raw === NONE_LEVEL_VALUE || raw === "" ? null : Number(raw);
    const mustClearStripe =
      !beltLevelId ||
      (selectedLevel && Number(beltLevelId) !== selectedLevel.id) ||
      (sortedStripes.length === 0 && value.stripeId !== null);
    if (mustClearStripe) {
      onChange({ beltLevelId, stripeId: null });
    } else {
      onChange({ beltLevelId, stripeId: value.stripeId });
    }
  };

  const handleStripeChange = (raw: string) => {
    const stripeId = raw === NONE_STRIPE_VALUE || raw === "" ? null : Number(raw);
    onChange({ beltLevelId: value.beltLevelId, stripeId });
  };

  const currentLevelValue = value.beltLevelId == null ? NONE_LEVEL_VALUE : String(value.beltLevelId);
  const currentStripeValue = value.stripeId == null ? NONE_STRIPE_VALUE : String(value.stripeId);

  return (
    <View
      style={styles.wrapper}
      {...getWebClassNameProps(testID ? `${testID}-belt-selector` : "belt-selector")}
      testID={testID ?? "belt-selector"}
    >
      {label ? (
        <Text
          style={[styles.groupLabel]}
          {...getWebClassNameProps("belt-selector__group-label")}
        >
          {label}
        </Text>
      ) : null}
      <View style={styles.groupBody}>
        <View style={styles.fieldRow}>
          <View style={styles.colorPreviewCol}>
            <BeltMiniPreview beltLevel={selectedLevel} stripeId={value.stripeId} />
          </View>
          <View style={styles.selectsCol}>
            <AppSelect
              label="Nivel de cinta"
              value={currentLevelValue}
              onValueChange={handleLevelChange}
              items={levelItems}
              placeholder={includeNoneOption ? "Sin cinta asignada" : "Selecciona una cinta"}
              enabled={enabled}
              error={levelError}
              nativeID={levelNativeID ?? "student-belt-level"}
              testID={testID ? `${testID}-belt-level` : "student-belt-level"}
            />
            <AppSelect
              label="Stripe"
              value={currentStripeValue}
              onValueChange={handleStripeChange}
              items={stripeItems}
              placeholder={includeNoneOption ? "Sin stripe" : "Selecciona un stripe"}
              enabled={enabled && sortedStripes.length > 0}
              error={stripeError}
              nativeID={stripeNativeID ?? "student-belt-stripe"}
              testID={testID ? `${testID}-belt-stripe` : "student-belt-stripe"}
            />
          </View>
        </View>
      </View>
    </View>
  );
};

interface MiniPreviewProps {
  beltLevel: BeltLevel | null;
  stripeId: number | null;
}

const BeltMiniPreview: React.FC<MiniPreviewProps> = ({ beltLevel, stripeId }) => {
  const stripe = useMemo(() => {
    if (!beltLevel || !stripeId) return null;
    return beltLevel.stripes?.find((s) => s.id === stripeId) ?? null;
  }, [beltLevel, stripeId]);

  const bg = beltLevel?.color_hex ?? "#E5E5E5";
  const fg = beltLevel?.text_color_hex ?? "#757575";

  return (
    <View
      style={styles.previewWrapper}
      {...getWebClassNameProps("belt-selector__preview-wrapper")}
    >
      <View
        style={[
          styles.previewBar,
          { backgroundColor: bg },
        ]}
        {...getWebClassNameProps("belt-selector__preview-bar")}
      >
        {stripe ? (
          <View
            style={[
              styles.previewStripeBar,
              {
                backgroundColor: "#000000",
                borderColor: fg,
              },
            ]}
            {...getWebClassNameProps("belt-selector__preview-stripe")}
          />
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
  },
  groupLabel: {
    fontSize: 14,
    fontFamily: typography.headingFamily,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  groupBody: {
    width: "100%",
  },
  fieldRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  colorPreviewCol: {
    width: 64,
    paddingTop: 34,
  },
  selectsCol: {
    flex: 1,
    gap: spacing.md,
  },
  previewWrapper: {
    width: 64,
    alignItems: "center",
    paddingVertical: spacing.xs,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  previewBar: {
    width: 48,
    height: 12,
    borderRadius: 4,
    position: "relative",
    shadowColor: "rgba(26, 26, 26, 0.10)",
    shadowOpacity: 0.7,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 0.5,
  },
  previewStripeBar: {
    position: "absolute",
    top: -2,
    bottom: -2,
    right: 4,
    width: 5,
    borderRadius: 2,
    borderWidth: 1,
    ...Platform.select({
      web: {
        boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
      } as any,
    }),
  },
});

export default BeltSelector;
