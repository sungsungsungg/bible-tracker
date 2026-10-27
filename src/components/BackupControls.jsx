import React, { useRef } from 'react';
import { Download, Upload } from 'lucide-react';

export default function BackupControls({ status, disabled, onExport, onImport }) {
  const fileInputRef = useRef(null);

  return (
    <div className="footer-tools">
      <span>
        {status === 'loading' && '기록 불러오는 중'}
        {status === 'saving' && '저장 중'}
        {status === 'saved' && '기록 저장됨'}
        {status === 'error' && '저장 연결 오류'}
      </span>
      <button type="button" className="backup-button" onClick={onExport} disabled={disabled}>
        <Download size={14} /> 백업 저장
      </button>
      <button
        type="button"
        className="backup-button"
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled}
      >
        <Upload size={14} /> 백업 복원
      </button>
      <input
        ref={fileInputRef}
        className="sr-only"
        type="file"
        accept="application/json,.json"
        onChange={onImport}
      />
    </div>
  );
}
