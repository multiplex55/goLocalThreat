interface SettingsFeatureProps {
  note: string;
  onNoteChange: (value: string) => void;
}

export function SettingsFeature({ note, onNoteChange }: SettingsFeatureProps) {
  return (
    <section data-testid="settings-feature">
      <h2>Settings</h2>
      <label htmlFor="settings-note">Workspace note</label>
      <input
        id="settings-note"
        data-testid="settings-note"
        value={note}
        onChange={(event) => onNoteChange(event.target.value)}
      />
    </section>
  );
}
