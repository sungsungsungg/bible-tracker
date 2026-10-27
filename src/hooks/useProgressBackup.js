export function useProgressBackup({
  currentPosition,
  readChapters,
  dailyHistory,
  restoreProgress,
  onRestored,
  onNotice,
}) {
  function exportProgress() {
    const backup = {
      app: '말씀길',
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      currentPosition,
      readChapters,
      dailyHistory,
    };
    const backupUrl = URL.createObjectURL(
      new Blob([`${JSON.stringify(backup, null, 2)}\n`], { type: 'application/json' }),
    );
    const downloadLink = document.createElement('a');
    downloadLink.href = backupUrl;
    downloadLink.download = `말씀길-백업-${new Date().toISOString().slice(0, 10)}.json`;
    downloadLink.click();
    window.setTimeout(() => URL.revokeObjectURL(backupUrl), 1000);
    onNotice('읽기 기록을 백업 파일로 저장했습니다.');
  }

  async function importProgress(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      if (file.size > 256 * 1024) throw new Error('백업 파일 크기가 너무 큽니다.');
      const backup = JSON.parse(await file.text());
      if (
        backup?.schemaVersion !== 1 ||
        !backup.currentPosition ||
        !backup.readChapters ||
        typeof backup.readChapters !== 'object' ||
        Array.isArray(backup.readChapters)
      ) {
        throw new Error('말씀길 백업 파일 형식이 아닙니다.');
      }
      if (!window.confirm('현재 읽기 기록을 선택한 백업으로 바꿀까요?')) return;

      const restored = await restoreProgress({
        currentPosition: backup.currentPosition,
        readChapters: backup.readChapters,
        dailyHistory: backup.dailyHistory ?? {},
      });
      onRestored(restored);
      onNotice('백업 기록을 복원했습니다.');
    } catch (error) {
      onNotice(error.message || '백업을 읽지 못했습니다.', 3200);
    } finally {
      event.target.value = '';
    }
  }

  return { exportProgress, importProgress };
}
