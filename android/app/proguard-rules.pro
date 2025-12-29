# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Keep Capacitor classes
-keep class com.getcapacitor.** { *; }
-keep @com.getcapacitor.annotation.CapacitorPlugin class * {
    @com.getcapacitor.PluginMethod public *;
}

# Keep WebView JavaScript interfaces
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep attributes for debugging
-keepattributes SourceFile,LineNumberTable
-keepattributes *Annotation*

# Keep JavaScript interface classes
-keepclassmembers class fqcn.of.javascript.interface.for.webview {
   public *;
}

# Keep Android support libraries
-keep class androidx.** { *; }
-keep interface androidx.** { *; }

# Keep Gson classes (if using for JSON)
-keepattributes Signature
-keepattributes *Annotation*
-keep class com.google.gson.** { *; }

# Optimize and obfuscate
-optimizationpasses 5
-dontusemixedcaseclassnames
-dontskipnonpubliclibraryclasses
-dontpreverify
-verbose
