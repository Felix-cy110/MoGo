Pod::Spec.new do |s|
  s.name = 'MoGoCore'
  s.version = '0.1.0'
  s.summary = 'MoGo offline C++20 application core'
  s.homepage = 'https://github.com/Felix-cy110/MoGo'
  s.license = { :type => 'MIT', :file => '../LICENSE' }
  s.author = 'MoGo'
  s.source = { :git => 'https://github.com/Felix-cy110/MoGo.git', :tag => s.version.to_s }
  s.platform = :ios, '15.1'
  investment = ENV.fetch('MOGO_FEATURE_INVESTMENT_MANAGEMENT', 'ON') != 'OFF'
  finance = ENV.fetch('MOGO_FEATURE_PERSONAL_FINANCE', 'ON') != 'OFF'
  profile = ENV.fetch('MOGO_FEATURE_USER_PROFILE', 'ON') != 'OFF'
  backup = ENV.fetch('MOGO_FEATURE_DATA_BACKUP', 'ON') != 'OFF'
  sources = ['core_shared/**/*.hpp', 'transports/native/include/**/*.hpp', 'transports/native/src/native_core.cpp', 'transports/native/src/commands.hpp', 'third_party/**/*.hpp']
  includes = ['core_shared/include', 'transports/native/include', 'transports/native/src', 'transports/contracts/include', 'third_party']
  definitions = ['$(inherited)']
  if finance || investment || backup
    sources += ['core_shared/src/*.cpp']
    s.libraries = 'sqlite3'
  end
  if backup
    sources += ['features/data_backup/**/*.{hpp,cpp}', 'transports/native/src/backup_commands.cpp', 'third_party/monocypher.{c,h}']
    includes += ['features/data_backup/application/include', 'features/data_backup/infrastructure/local/include']
    definitions << 'MOGO_FEATURE_DATA_BACKUP=1'
  end
  if investment
    sources += ['features/investment_management/**/*.{hpp,cpp}', 'transports/native/src/investment_commands.cpp', 'transports/contracts/include/mogo/contracts/investment_json.hpp']
    includes += ['features/investment_management/domain/include', 'features/investment_management/application/include', 'features/investment_management/infrastructure/sqlite/include']
    definitions << 'MOGO_FEATURE_INVESTMENT_MANAGEMENT=1'
  end
  if finance
    sources += ['features/personal_finance/**/*.{hpp,cpp}', 'transports/native/src/finance_commands.cpp', 'transports/contracts/include/mogo/contracts/finance_json.hpp']
    includes += ['features/personal_finance/domain/include', 'features/personal_finance/application/include', 'features/personal_finance/infrastructure/sqlite/include']
    definitions << 'MOGO_FEATURE_PERSONAL_FINANCE=1'
    s.libraries = 'sqlite3'
  end
  if profile
    sources += ['features/user_profile/**/*.{hpp,cpp}', 'transports/native/src/profile_commands.cpp', 'transports/contracts/include/mogo/contracts/profile_json.hpp']
    includes += ['features/user_profile/domain/include', 'features/user_profile/application/include', 'features/user_profile/infrastructure/json/include']
    definitions << 'MOGO_FEATURE_USER_PROFILE=1'
  end
  s.source_files = sources
  s.header_mappings_dir = '.'
  s.pod_target_xcconfig = {
    'CLANG_CXX_LANGUAGE_STANDARD' => 'c++20',
    'GCC_PREPROCESSOR_DEFINITIONS' => definitions.join(' '),
    'HEADER_SEARCH_PATHS' => includes.map { |path| '"$(PODS_TARGET_SRCROOT)/' + path + '"' }.join(' ')
  }
end
