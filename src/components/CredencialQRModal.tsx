import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system";
import * as FileSystemLegacy from "expo-file-system/legacy";
import { useRef, useState } from "react";
import {
  Alert,
  Platform,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { captureRef } from "react-native-view-shot";
import QRCode, { QRCodeProps } from "react-native-qrcode-svg";

import { AppButton } from "@/components/AppButton";
import { AppModal } from "@/components/AppModal";
import { colors, radius, spacing, typography } from "@/constants/theme";

export interface CredencialQRModalProps {
  visible: boolean;
  onClose: () => void;
  uniqueCode: string;
  studentFullName: string;
  studentPhotoUrl?: string | null;
  branchName?: string | null;
  enrollmentDateText?: string | null;
  organizationName?: string | null;
  nativeID?: string;
  testID?: string;
}

const AGED_WOOD_SOFT_FALLBACK = agedWoodSoftValue();
function agedWoodSoftValue(): string {
  try {
    return colors.woodSoft;
  } catch {
    return "rgba(141, 110, 99, 0.12)";
  }
}

export function CredencialQRModal({
  visible,
  onClose,
  uniqueCode,
  studentFullName,
  studentPhotoUrl,
  branchName,
  enrollmentDateText,
  organizationName,
  nativeID,
  testID,
}: CredencialQRModalProps) {
  const { width: windowWidth } = useWindowDimensions();
  const baseId = nativeID ?? testID ?? "credential-qr-modal";
  const qrSvgRef = useRef<QRCodeProps>(null);
  const cardRef = useRef<View>(null);
  const [sharing, setSharing] = useState(false);

  const cardMaxWidth = Math.min(windowWidth - spacing.lg * 2 - spacing.lg * 2, 380);
  const qrSize = Math.min(cardMaxWidth - spacing.lg * 2, 240);

  async function handleShare() {
    try {
      setSharing(true);

      if (Platform.OS === "web") {
        await handleShareWeb();
        return;
      }

      await handleShareNative();
    } catch (err) {
      Alert.alert("No pudimos abrir el menú de compartir", "Podés guardar la imagen primero y luego compartirla manualmente.");
    } finally {
      setSharing(false);
    }
  }

  async function handleShareWeb() {
    const cardUri = await captureCardAsDataUri();
    if (cardUri) {
      try {
        const file = dataUriToFile(cardUri, `${sanitizeFilename(studentFullName)}-eldojo-qr.png`);
        if (file && navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: `Credencial QR de ${studentFullName}`,
            text: buildShareText(),
            files: [file],
          });
          return;
        }
      } catch {
        // Web Share API with files not supported, fall through to download
      }
    }

    if (cardUri) {
      triggerWebDownload(cardUri, `${sanitizeFilename(studentFullName)}-eldojo-qr.png`);
      return;
    }

    const textPayload = buildShareText();
    if (navigator.share) {
      await navigator.share({ title: "Credencial QR ElDojo", text: textPayload });
    } else {
      await Share.share({ message: textPayload, title: "Credencial QR ElDojo" });
    }
  }

  async function handleShareNative() {
    const cardUri = await captureCardAsDataUriWithRetry();
    if (!cardUri) {
      const textPayload = buildShareText();
      await Share.share({ message: textPayload, title: "Credencial QR ElDojo" });
      return;
    }

    const filename = `${sanitizeFilename(studentFullName)}-${uniqueCode}-eldojo-qr.png`;
    const cacheDirectory = (FileSystemLegacy as unknown as { cacheDirectory?: string | null }).cacheDirectory ?? "";
    const cachePath = `${cacheDirectory}${filename}`;
    const base64Payload = cardUri.replace(/^data:image\/png;base64,/, "");
    await FileSystemLegacy.writeAsStringAsync(cachePath, base64Payload, { encoding: FileSystemLegacy.EncodingType.Base64 });

    let shareUri: string = cachePath;
    if (Platform.OS === "android") {
      try {
        const contentUri = await FileSystemLegacy.getContentUriAsync(cachePath);
        if (contentUri) shareUri = contentUri;
      } catch {
        // fallback to cachePath
      }
    }

    const Sharing = await import("expo-sharing");
    const canShareNative = await Sharing.isAvailableAsync();
    if (canShareNative) {
      await Sharing.shareAsync(shareUri, {
        mimeType: "image/png",
        dialogTitle: `Compartir credencial QR de ${studentFullName}`,
        UTI: "public.png",
      });
    } else {
      await Share.share({
        message: buildShareText(),
        title: "Credencial QR ElDojo",
      });
    }
  }

  function handleCopyCode() {
    const fallbackMessage = Platform.OS === "web"
      ? "Copialo manualmente con el cursor."
      : "Copialo y pegalo en la asistencia manual si fuera necesario.";
    Alert.alert("Código único", `${uniqueCode}\n\n${fallbackMessage}`);
  }

  async function captureCardAsDataUri(): Promise<string | null> {
    if (!cardRef.current) return captureQrOnlyAsDataUri();
    try {
      const uri = await captureRef(cardRef.current, {
        result: "data-uri",
        format: "png",
        quality: 0.92,
        snapshotContentContainer: true,
      });
      if (uri && uri.startsWith("data:image")) return uri;
      return captureQrOnlyAsDataUri();
    } catch {
      return captureQrOnlyAsDataUri();
    }
  }

  async function captureCardAsDataUriWithRetry(): Promise<string | null> {
    for (let attempt = 0; attempt < 3; attempt++) {
      const result = await captureCardAsDataUri();
      if (result) return result;
      if (attempt < 2) {
        await new Promise((r) => setTimeout(r, 150));
      }
    }
    return null;
  }

  async function captureQrOnlyAsDataUri(): Promise<string | null> {
    return new Promise((resolve) => {
      const svgRef = qrSvgRef.current as unknown as { toDataURL?: (callback: (data: string) => void) => void } | null;
      if (!svgRef?.toDataURL) {
        resolve(null);
        return;
      }
      try {
        svgRef.toDataURL((data: string) => {
          const normalized = data.startsWith("data:") ? data : `data:image/png;base64,${data}`;
          resolve(normalized);
        });
      } catch {
        resolve(null);
      }
    });
  }

  function buildShareText(): string {
    const parts = [
      `Credencial QR de ${studentFullName}`,
      organizationName ? `Dojo: ${organizationName}` : null,
      branchName ? `Sucursal: ${branchName}` : null,
      `Código único: ${uniqueCode}`,
    ].filter(Boolean) as string[];
    return parts.join("\n");
  }

  function sanitizeFilename(raw: string): string {
    return raw.replace(/[^A-Za-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "alumno";
  }

  function dataUriToFile(dataUri: string, filename: string): File | null {
    try {
      const matches = dataUri.match(/^data:(image\/\w+);base64,(.*)$/);
      if (!matches) return null;
      const mime = matches[1];
      const b64 = matches[2];
      const binary = atob(b64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      return new File([bytes], filename, { type: mime });
    } catch {
      return null;
    }
  }

  function triggerWebDownload(dataUri: string, filename: string) {
    const a = document.createElement("a");
    a.href = dataUri;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  return (
    <AppModal
      visible={visible}
      title="Credencial QR de asistencia"
      description="Mostra este QR al staff al entrar al dojo o guardalo/ compartilo para que el alumno lo use todos los días."
      onClose={onClose}
      nativeID={baseId}
      testID={baseId}
    >
      <View style={styles.layout}>
        <View
          ref={cardRef}
          style={[styles.credentialCard, { width: "100%", maxWidth: cardMaxWidth }]}
          nativeID={`${baseId}-credential-card`}
          testID={`${baseId}-credential-card`}
        >
          <View style={styles.credentialHeader}>
            <View style={styles.brandBlock}>
              <View style={styles.brandDot} />
              <View style={styles.brandCopy}>
                <Text style={styles.brandTitle}>{organizationName ?? "ElDojo"}</Text>
                <Text style={styles.brandSubtitle}>Credencial oficial de asistencia</Text>
              </View>
            </View>
            <View style={styles.codeTag}>
              <Text style={styles.codeTagLabel}>QR</Text>
            </View>
          </View>

          <View style={styles.profileHeader}>
            <View style={styles.avatarFallback}>
              <Ionicons name="person" size={32} color={colors.wood} />
            </View>
            <View style={styles.profileCopy}>
              <Text style={styles.studentName} numberOfLines={2}>
                {studentFullName}
              </Text>
              <View style={styles.codeRowWrapper}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handleCopyCode}
                  style={styles.codeRow}
                  accessibilityRole="button"
                >
                  <Ionicons name="qr-code" size={14} color={colors.wood} />
                  <Text
                    nativeID={`${baseId}-copy-code-button`}
                    testID={`${baseId}-copy-code-button`}
                    style={styles.uniqueCode}
                    selectable
                  >
                    {uniqueCode}
                  </Text>
                  <Ionicons name="copy" size={14} color={colors.wood} />
                </TouchableOpacity>
              </View>
              {branchName ? <Text style={styles.metaText} numberOfLines={1}>{branchName}</Text> : null}
              {enrollmentDateText ? (
                <Text style={styles.metaTextLight}>Inscripción · {enrollmentDateText}</Text>
              ) : null}
            </View>
          </View>

          <View style={styles.qrBlock}>
            <View style={[styles.qrBox, { width: qrSize, height: qrSize }]}>
              {uniqueCode ? (
                <QRCode
                  value={uniqueCode}
                  size={qrSize - spacing.sm * 2}
                  color={colors.ink}
                  backgroundColor={colors.surface}
                  quietZone={0}
                  logoBorderRadius={8}
                  getRef={(svgRef) => {
                    qrSvgRef.current = svgRef as unknown as QRCodeProps;
                  }}
                />
              ) : (
                <View style={styles.qrPlaceholder} />
              )}
            </View>
            <Text style={styles.scanHint}>Acerca este código al lector del dojo al ingresar.</Text>
          </View>

          <View style={styles.securityFooter}>
            <Ionicons name="shield-checkmark" size={14} color={colors.woodLight} />
            <Text style={styles.securityText}>
              Este código es personal e intransferible. El sistema evita doble check-in en la misma sesión.
            </Text>
          </View>
        </View>

        <View style={styles.actionsGrid}>
          <AppButton
            label="Compartir (WhatsApp / correo)"
            nativeID={`${baseId}-share-button`}
            testID={`${baseId}-share-button`}
            onPress={handleShare}
            loading={sharing}
            leadingIcon={<Ionicons name="share-social" size={18} color={colors.onPrimary} />}
            style={{ minHeight: 50 }}
          />
        </View>

        <View style={styles.noticeBlock}>
          <Ionicons name="information-circle" size={16} color={colors.wood} />
          <Text style={styles.noticeText}>
            El QR es único por alumno y es valido por siempre. No es necesario regenerarlo.
          </Text>
        </View>
      </View>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  layout: {
    alignItems: "center",
    gap: spacing.lg,
  },
  credentialCard: {
    alignSelf: "center",
    backgroundColor: colors.surface,
    borderColor: colors.borderStrong,
    borderRadius: 28,
    borderWidth: 1,
    gap: spacing.lg,
    overflow: "hidden",
    padding: spacing.lg,
    ...Platform.select({
      ios: {
        shadowColor: "#1A1A1A",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.08,
        shadowRadius: 24,
      },
      android: { elevation: 3 },
      web: {
        boxShadow: "0 10px 30px rgba(26, 26, 26, 0.08)",
      },
    }),
  },
  credentialHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  brandBlock: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  brandDot: {
    backgroundColor: colors.gold,
    borderRadius: 999,
    height: 12,
    width: 12,
  },
  brandCopy: { gap: 2 },
  brandTitle: {
    color: colors.woodStrong,
    fontFamily: typography.headingFamily,
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  brandSubtitle: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 12,
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },
  codeTag: {
    alignSelf: "flex-start",
    backgroundColor: AGED_WOOD_SOFT_FALLBACK,
    borderColor: colors.wood,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  codeTagLabel: {
    color: colors.wood,
    fontFamily: typography.headingFamily,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  profileHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
  },
  avatarFallback: {
    alignItems: "center",
    aspectRatio: 1,
    backgroundColor: AGED_WOOD_SOFT_FALLBACK,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 68,
    justifyContent: "center",
    width: 68,
  },
  profileCopy: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  codeRowWrapper: {
    minHeight: 32,
  },
  studentName: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 20,
    fontWeight: "800",
    lineHeight: 24,
  },
  codeRow: {
    alignSelf: "flex-start",
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    paddingVertical: 4,
  },
  uniqueCode: {
    color: colors.woodStrong,
    fontFamily: typography.monoFamily ?? typography.bodyFamily,
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  metaText: {
    color: colors.text,
    fontFamily: typography.bodyFamily,
    fontSize: 13,
    fontWeight: "600",
  },
  metaTextLight: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 12,
  },
  qrBlock: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: 22,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
    width: "100%",
  },
  qrBox: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    justifyContent: "center",
    padding: spacing.sm,
  },
  qrPlaceholder: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    height: "100%",
    opacity: 0.4,
    width: "100%",
  },
  scanHint: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
  },
  securityFooter: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 8,
  },
  securityText: {
    color: colors.textMuted,
    flex: 1,
    fontFamily: typography.bodyFamily,
    fontSize: 12,
    lineHeight: 18,
  },
  actionsGrid: {
    gap: spacing.sm,
    width: "100%",
  },
  noticeBlock: {
    alignItems: "flex-start",
    backgroundColor: AGED_WOOD_SOFT_FALLBACK,
    borderColor: colors.wood,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    padding: spacing.sm,
    width: "100%",
  },
  noticeText: {
    color: colors.woodStrong,
    flex: 1,
    fontFamily: typography.bodyFamily,
    fontSize: 12,
    lineHeight: 18,
  },
});
