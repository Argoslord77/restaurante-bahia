package com.cajafacil.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.cajafacil.app.printer.CajaFacilPrinter;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Plugin propio (Kotlin, M1 dojo): vive en el app module -> registro manual.
        registerPlugin(CajaFacilPrinter.class);
        super.onCreate(savedInstanceState);
    }
}
