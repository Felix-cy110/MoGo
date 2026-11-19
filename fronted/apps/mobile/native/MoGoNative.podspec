require 'json'
package = JSON.parse(File.read(File.join(__dir__, 'package.json')))
Pod::Spec.new do |s|
  s.name = 'MoGoNative'
  s.version = package['version']
  s.summary = 'Offline TurboModule adapter for MoGo C++ features'
  s.homepage = 'https://github.com/Felix-cy110/MoGo'
  s.license = { :type => 'MIT', :file => '../../../../LICENSE' }
  s.author = 'MoGo'
  s.platforms = { :ios => '15.1' }
  s.source = { :git => 'https://github.com/Felix-cy110/MoGo.git', :tag => s.version.to_s }
  s.source_files = 'ios/**/*.{h,mm}'
  backend = File.realpath(File.join(__dir__, '../../../../backend'))
  s.pod_target_xcconfig = {
    'CLANG_CXX_LANGUAGE_STANDARD' => 'c++20',
    'HEADER_SEARCH_PATHS' => '$(inherited) "' + backend + '/transports/native/include"'
  }
  s.dependency 'MoGoCore'
  install_modules_dependencies(s)
end
