package sina;

import java.io.IOException;

import org.mozilla.javascript.EvaluatorException;

public class Test {

	/**
	 * @param args
	 * @throws IOException 
	 * @throws EvaluatorException 
	 */
	public static void main(String[] args) throws EvaluatorException, IOException {
		String[] arg = {"/Users/ilfe/compress/input","/Users/ilfe/compress/output","false"};
		BatchCompressor.main(arg);
	}

}
