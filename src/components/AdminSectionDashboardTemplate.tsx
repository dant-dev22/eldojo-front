import { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing, typography } from "@/constants/theme";

interface AdminSectionDashboardTemplateProps {
  idPrefix: string;
  title?: string;
  description?: string;
  badge?: ReactNode;
  actions?: ReactNode;
  toolbar?: ReactNode;
  summary?: ReactNode;
}

export function AdminSectionDashboardTemplate({
  idPrefix,
  title,
  description,
  badge,
  actions,
  toolbar,
  summary,
}: AdminSectionDashboardTemplateProps) {
  return (
    <View nativeID={`${idPrefix}-root`} style={styles.root} testID={`${idPrefix}-root`}>
      {title || badge || actions ? (
        <View nativeID={`${idPrefix}-header`} style={styles.header} testID={`${idPrefix}-header`}>
          <View nativeID={`${idPrefix}-copy`} style={styles.copy} testID={`${idPrefix}-copy`}>
            {title ? (
              <Text nativeID={`${idPrefix}-title`} style={styles.title} testID={`${idPrefix}-title`}>
                {title}
              </Text>
            ) : null}
            {description ? (
              <Text nativeID={`${idPrefix}-description`} style={styles.description} testID={`${idPrefix}-description`}>
                {description}
              </Text>
            ) : null}
          </View>
          {badge || actions ? (
            <View nativeID={`${idPrefix}-meta`} style={styles.meta} testID={`${idPrefix}-meta`}>
              {badge}
              {actions}
            </View>
          ) : null}
        </View>
      ) : null}
      {toolbar ? (
        <View nativeID={`${idPrefix}-toolbar`} style={styles.toolbar} testID={`${idPrefix}-toolbar`}>
          {toolbar}
        </View>
      ) : null}
      {summary ? (
        <View nativeID={`${idPrefix}-summary`} style={styles.summary} testID={`${idPrefix}-summary`}>
          {summary}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: spacing.md,
    width: "100%",
  },
  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    justifyContent: "space-between",
  },
  copy: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  title: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  description: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 14,
    lineHeight: 20,
  },
  meta: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  toolbar: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
  },
  summary: {
    gap: spacing.sm,
  },
});
