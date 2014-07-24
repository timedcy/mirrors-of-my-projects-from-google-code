package im.session;


import android.os.Bundle;
import org.apache.cordova.*;

public class Main extends DroidGap
{
    public void onCreate(Bundle savedInstanceState)
    {
        super.onCreate(savedInstanceState);
        super.loadUrl("file:///android_asset/www/gushi/index.htm");
    }
}