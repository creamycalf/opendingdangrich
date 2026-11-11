package local.dingdang.touch;

import android.content.Context;
import android.content.SharedPreferences;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import org.json.JSONObject;

@CapacitorPlugin(name = "GameSave")
public class GameSavePlugin extends Plugin {
    @PluginMethod
    public void exit(PluginCall call) {
        getActivity().runOnUiThread(() -> { call.resolve(); getActivity().finish(); });
    }
    @Override
    protected void handleOnPause() {
        bridge.eval("window.dispatchEvent(new Event('dingdangPause'));", null);
    }
    @Override
    protected void handleOnResume() {
        bridge.eval("window.dispatchEvent(new Event('dingdangResume'));", null);
    }
    private SharedPreferences store() {
        return getContext().getSharedPreferences("dingdang-game-save", Context.MODE_PRIVATE);
    }
    @PluginMethod
    public void read(PluginCall call) {
        SharedPreferences prefs = store();
        JSObject result = new JSObject();
        result.put("initialized", prefs.getBoolean("initialized", false));
        String value = prefs.getString("value", null);
        result.put("value", value == null ? JSONObject.NULL : value);
        // Capacitor 7's WebMessage listener updates its reply proxy after
        // dispatching to the plugin thread. Post the reply to the UI queue so
        // a fast read after reload cannot answer through the previous page.
        getActivity().runOnUiThread(() -> call.resolve(result));
    }
    @PluginMethod
    public void write(PluginCall call) {
        if (!call.getData().has("value")) { reject(call, "Missing save value"); return; }
        String value = call.getString("value");
        if (value != null && value.length() > 2_000_000) { reject(call, "Save exceeds size limit"); return; }
        SharedPreferences.Editor edit = store().edit().putBoolean("initialized", true);
        if (value == null) edit.remove("value"); else edit.putString("value", value);
        // Capacitor invokes this on its handler thread. Acknowledgement follows
        // commit() to disk, unlike asynchronous SharedPreferences.apply().
        if (edit.commit()) getActivity().runOnUiThread(() -> call.resolve());
        else reject(call, "Unable to persist game save");
    }
    private void reject(PluginCall call, String message) {
        getActivity().runOnUiThread(() -> call.reject(message));
    }
}
