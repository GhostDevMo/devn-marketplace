package com.devnconnect.app;

import android.os.Bundle;
import android.view.View;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);

    // Prevent content from drawing under the status bar
    WindowCompat.setDecorFitsSystemWindows(getWindow(), true);
  }
}