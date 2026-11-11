using System;
using System.Diagnostics;
using System.IO;
using System.Windows.Forms;

// Launch the repaired workspace copy with the resource directory it expects.
internal static class OriginalLauncher {
    [STAThread]
    static void Main() {
        string folder = AppDomain.CurrentDomain.BaseDirectory;
        string exe = Path.Combine(folder, "Doraemon.exe");
        try {
            Process.Start(new ProcessStartInfo(exe) {
                WorkingDirectory = folder,
                UseShellExecute = false
            });
        } catch (Exception error) {
            File.WriteAllText(Path.Combine(folder, "launcher-error.txt"), error.ToString());
            MessageBox.Show(error.Message, "Original game launch failed");
        }
    }
}
