package com.mogo.nativecore

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

class MoGoNativePackage : BaseReactPackage() {
    override fun getModule(name: String, context: ReactApplicationContext): NativeModule? =
        if (name == MoGoNativeModule.NAME) MoGoNativeModule(context) else null

    override fun getReactModuleInfoProvider() = ReactModuleInfoProvider {
        mapOf(MoGoNativeModule.NAME to ReactModuleInfo(
            MoGoNativeModule.NAME, MoGoNativeModule.NAME, false, false, false, true
        ))
    }
}
